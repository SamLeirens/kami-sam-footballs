import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:pt-6 md:pb-10">{children}</main>
    </>
  );
}
