import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(()=>({find:vi.fn(),connect:vi.fn(),verify:vi.fn(),getToken:vi.fn()}));
vi.mock("../lib/db",()=>({connectDB:mocks.connect}));
vi.mock("../lib/models/Employee",()=>({Employee:{findOne:mocks.find}}));
vi.mock("../lib/admin-verification",()=>({verifyAdminCode:mocks.verify}));
vi.mock("next-auth/jwt",()=>({getToken:mocks.getToken}));
import { authOptions } from "../lib/auth";
import { proxy } from "../proxy";
import { NextRequest } from "next/server";
const jwt = authOptions.callbacks!.jwt!;
type JwtArgs = Parameters<typeof jwt>[0];
const invoke = (args:Partial<JwtArgs>) => jwt({token:{},user:undefined as never,account:null,...args});
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv("OWNER_EMAIL","owner@example.test");vi.stubEnv("ADMIN_EMAILS","alias@example.test");vi.stubEnv("ACCESS_ALLOWLIST","");
  mocks.find.mockReturnValue({select:vi.fn().mockResolvedValue({_id:"record",role:"owner",status:"complete"})});
});
afterEach(()=>vi.unstubAllEnvs());
describe("actual authentication callback",()=>{
  it("strips database admin roles from every unlisted email",async()=>{
    const token=await invoke({token:{email:"other@example.test",role:"owner",adminChallengeId:"session",adminVerifiedAt:Date.now()}});
    expect(token.role).toBe("employee");
  });
  it("does not trust role or verification flags submitted by the client",async()=>{
    const token=await invoke({token:{email:"owner@example.test",adminChallengeId:"session"},trigger:"update",session:{role:"owner",adminVerifiedAt:Date.now(),adminVerificationRequired:false}});
    expect(token.role).toBe("employee");expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("requires the server to accept the code before elevating",async()=>{
    mocks.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const pending={email:"owner@example.test",adminChallengeId:"session"};
    expect((await invoke({token:{...pending},trigger:"update",session:{adminVerificationCode:"123456"}})).role).toBe("employee");
    expect((await invoke({token:{...pending},trigger:"update",session:{adminVerificationCode:"654321"}})).role).toBe("owner");
    expect(mocks.verify).toHaveBeenLastCalledWith("owner@example.test","session","654321");
  });
  it("clears previous admin verification on every new primary sign-in",async()=>{
    const token=await invoke({token:{email:"owner@example.test",adminChallengeId:"old",adminVerifiedAt:Date.now()},user:{id:"provider-user",email:"owner@example.test"}});
    expect(token.role).toBe("employee");expect(token.adminVerifiedAt).toBeUndefined();expect(token.adminChallengeId).not.toBe("old");
  });
  it("does not elevate legacy sessions or offboarded accounts",async()=>{
    expect((await invoke({token:{email:"owner@example.test",role:"owner"}})).role).toBe("employee");
    mocks.find.mockReturnValue({select:vi.fn().mockResolvedValue({_id:"record",role:"owner",status:"offboarded"})});
    const token=await invoke({token:{email:"owner@example.test",adminChallengeId:"session",adminVerifiedAt:Date.now()}});
    expect(token.status).toBe("offboarded");
  });
  it("drops old privileges if the database cannot refresh permission state",async()=>{
    mocks.connect.mockRejectedValueOnce(new Error("unavailable"));
    const token=await invoke({token:{email:"owner@example.test",role:"owner",adminChallengeId:"session",adminVerifiedAt:Date.now()}});
    expect(token.role).toBe("employee");expect(token.status).toBe("offboarded");expect(token.adminVerifiedAt).toBeUndefined();
  });
});
describe("admin page proxy",()=>{
  it("redirects a pending authorized admin to verification",async()=>{
    mocks.getToken.mockResolvedValue({email:"owner@example.test",role:"owner",adminChallengeId:"session"});
    const response=await proxy(new NextRequest("https://people.plannorium.com/admin"));
    expect(response.headers.get("location")).toBe("https://people.plannorium.com/verify-admin");
  });
  it("blocks stale elevated cookies for unlisted addresses",async()=>{
    mocks.getToken.mockResolvedValue({email:"other@example.test",role:"owner",adminChallengeId:"session",adminVerifiedAt:Date.now()});
    const response=await proxy(new NextRequest("https://people.plannorium.com/admin"));
    expect(response.headers.get("location")).toBe("https://people.plannorium.com/me");
  });
  it("keeps settings owner-only after email verification",async()=>{
    mocks.getToken.mockResolvedValue({email:"alias@example.test",role:"owner",adminChallengeId:"session",adminVerifiedAt:Date.now()});
    const response=await proxy(new NextRequest("https://people.plannorium.com/admin/settings"));
    expect(response.headers.get("location")).toBe("https://people.plannorium.com/admin");
  });
});
