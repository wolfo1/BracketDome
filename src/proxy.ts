export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/tournament/create",
    "/tournament/:id/admin",
  ],
};
