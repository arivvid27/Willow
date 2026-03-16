/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/signup` | `/(tabs)` | `/(tabs)/` | `/(tabs)/chat` | `/(tabs)/insights` | `/(tabs)/log` | `/(tabs)/settings` | `/_sitemap` | `/chat` | `/insights` | `/log` | `/login` | `/settings` | `/signup`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
