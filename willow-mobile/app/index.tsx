// app/index.tsx — redirect to auth check
import { Redirect } from "expo-router";
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
