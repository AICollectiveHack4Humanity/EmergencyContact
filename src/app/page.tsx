import { redirect } from "next/navigation";

export const metadata = { title: "Haven" };

export default function Home() {
  redirect("/session");
}
