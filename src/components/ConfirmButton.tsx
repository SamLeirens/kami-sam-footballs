"use client";

export function ConfirmButton({
  message,
  className = "btn-danger",
  children,
  formAction,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <button
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
