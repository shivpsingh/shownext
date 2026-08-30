"use client";

import { FormEvent, useId, useState } from "react";

type FormStatus = "idle" | "submitting" | "success" | "invalid" | "error";

type WaitlistFormProps = {
  variant?: "default" | "pill";
};

export function WaitlistForm({ variant = "default" }: WaitlistFormProps) {
  const formId = useId();
  const emailId = `${formId}-email`;
  const statusId = `${formId}-status`;
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value) || value.length > 254) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, website }),
      });
      setStatus(response.ok ? "success" : response.status === 400 ? "invalid" : "error");
      if (response.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  const message = (
    {
      success: "You’re on the list. We’ll be in touch when the first build is ready.",
      invalid: "Enter a valid email address.",
      error: "We couldn’t save your email. Try again.",
    } as Record<string, string>
  )[status];

  const formClass = variant === "pill" ? "hero-form waitlist-form" : "waitlist-form";

  return (
    <form className={formClass} onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor={emailId}>
        Email address
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Your email address"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "submitting" || status === "success"}
        aria-describedby={statusId}
      />
      <label className="honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>
      <button type="submit" disabled={status === "submitting" || status === "success"}>
        {status === "submitting" ? "Saving…" : status === "success" ? "You’re on the list" : variant === "pill" ? "Join waitlist" : "Join the early list"}
        {variant === "default" ? <span aria-hidden="true">↗</span> : null}
      </button>
      {message ? (
        <p id={statusId} className={`form-status ${status}`} aria-live="polite">
          {message}
        </p>
      ) : (
        <p id={statusId} className="form-status sr-only" aria-live="polite" />
      )}
    </form>
  );
}
