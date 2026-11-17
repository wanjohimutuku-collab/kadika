import { Redirect } from 'expo-router';

/** Gate-only mode: bypass marketing welcome and open straight into the gate join scanner. */
export default function Welcome() {
  return <Redirect href="/gate-join" />;
}
