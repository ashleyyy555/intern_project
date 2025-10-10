// app sign in page

import { login } from "@/lib/auth";
import Link from "next/link";

type SearchParams = {
  error?: string;
  identifier?: string;
  registered?: string; // "1" if just registered
};

export default function SignInPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const error = searchParams?.error;
  const prefill = searchParams?.identifier || "";
  const registered = searchParams?.registered === "1";

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Database</h2>
          <p className="text-gray-600">Sign in to view and key in data</p>
        </div>

        {registered && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
            Registration successful. You can sign in now.
          </div>
        )}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={login} className="mt-6 space-y-4">
          <input type="hidden" name="callbackUrl" value="/dashboard" />

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              name="identifier"
              defaultValue={prefill}
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com or yourusername"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              name="password"
              type="password"
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          No account?{" "}
          <Link
            href={`/register${prefill ? `?identifier=${encodeURIComponent(prefill)}` : ""}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Create one
          </Link>
        </div>

        <div className="mt-2 text-center text-sm text-gray-500">
          By signing in, you agree to our{" "}
          <a href="#" className="text-indigo-600 hover:text-indigo-500">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-indigo-600 hover:text-indigo-500">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
