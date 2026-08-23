import GuestGuard from "@/components/auth/GuestGuard";

export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestGuard>{children}</GuestGuard>;
}
