import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-pitch-800 p-4">
      <div className="card w-full max-w-sm">
        <h1 className="h1 mb-1">⚽ Kami Football</h1>
        <p className="mb-4 text-sm text-neutral-500">Admin login</p>
        <LoginForm />
      </div>
    </main>
  );
}
