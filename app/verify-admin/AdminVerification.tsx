"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminVerification({email}:{email:string}) {
  const { update } = useSession();
  const { language } = useLanguage();
  const ar = language === "ar";
  const router = useRouter();
  const [code,setCode] = useState("");
  const [busy,setBusy] = useState<"send"|"verify"|null>(null);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState("");
  async function send() {
    setBusy("send");setError("");
    try {
      const response = await fetch("/api/admin-verification/send", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const body = await response.json();
      if (!response.ok) throw new Error(ar ? (response.status === 503 ? "لم يتم إعداد بريد التحقق أو تعذّر إرسال الرسالة. تواصل مع مالك الحساب." : response.status === 429 ? "يرجى الانتظار قبل طلب رمز آخر. بعد محاولات كثيرة، انتظر عشر دقائق." : response.status === 401 ? "أعد تسجيل الدخول قبل تأكيد وصول المسؤول." : "تعذّر إرسال رمز التحقق.") : body.error || "Could not send a code.");
      setSent(true);
    } catch(e) {setError(e instanceof Error ? e.message : "Could not send a code.");}
    finally {setBusy(null);}
  }
  async function verify(event:React.FormEvent) {
    event.preventDefault();setBusy("verify");setError("");
    try {
      const session = await update({adminVerificationCode:code});
      if (!session || !["owner","hr_admin"].includes(session.user.role)) throw new Error(ar ? "الرمز غير صالح أو انتهت صلاحيته. اطلب رمزًا جديدًا عند الحاجة." : "The code is invalid or expired. Request a new code if needed.");
      setCode("");router.replace("/admin");router.refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not verify this code.");}
    finally {setBusy(null);}
  }
  return <section className="mx-auto max-w-md rounded-[28px] bg-surface p-6 shadow-card sm:p-9">
    <ShieldCheck className="mb-5 h-9 w-9 text-tint" aria-hidden="true"/>
    <h1 className="text-title1 font-bold">{ar ? "تأكيد وصول المسؤول" : "Verify admin access"}</h1>
    <p className="mt-3 text-sm leading-relaxed text-label-2">{ar ? "بعد تسجيل الدخول، أكّد وصولك باستخدام رمز يُرسل إلى بريدك الإلكتروني المعتمد." : "After signing in, confirm your access with a code sent to your authorized email address."}</p>
    <p dir="ltr" className="mt-3 break-all text-sm text-label">{email}</p>
    <p className="mt-2 text-xs leading-relaxed text-label-2">{ar ? "الرمز صالح لمدة تصل إلى 10 دقائق، ويُستخدم مرة واحدة لهذا التسجيل فقط." : "The code expires within 10 minutes and can be used once, only for this sign-in."}</p>
    {error && <div className="mt-5"><Banner tone="danger">{error}</Banner></div>}
    {sent && <div className="mt-5"><Banner tone="success">{ar ? "تم إرسال الرمز. تحقّق من بريدك الإلكتروني." : "Code sent. Check your inbox."}</Banner></div>}
    <Button onClick={send} type="button" variant="secondary" isLoading={busy==="send"} disabled={!!busy} className="mt-6 w-full">{sent ? (ar ? "إرسال رمز آخر" : "Send another code") : (ar ? "إرسال رمز التحقق" : "Send verification code")}</Button>
    <form onSubmit={verify} className="mt-5 space-y-4">
      <Input label={ar ? "رمز من ستة أرقام" : "Six-digit code"} ltr inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000" required/>
      <Button type="submit" disabled={!!busy||code.length!==6} isLoading={busy==="verify"} className="w-full">{ar ? "تأكيد والمتابعة" : "Verify and continue"}</Button>
    </form>
    <Button type="button" variant="ghost" disabled={!!busy} onClick={()=>signOut({callbackUrl:"/sign-in"})} className="mt-4 w-full">{ar ? "تسجيل الدخول من جديد" : "Sign in again"}</Button>
  </section>;
}
