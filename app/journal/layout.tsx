import Nav from "@/components/Nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div style={{ paddingBottom: 88 }}>{children}</div>
    </>
  );
}
