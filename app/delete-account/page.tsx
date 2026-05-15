import { redirect } from "next/navigation";

/** Short public URL — same content as /account-data-deletion (e.g. for Play Console). */
export default function DeleteAccountAliasPage() {
  redirect("/account-data-deletion");
}
