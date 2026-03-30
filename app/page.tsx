import { redirect } from "next/navigation";

/** Customer shop is the default entry — marketing lives at /welcome */
export default function RootPage() {
  redirect("/shop");
}
