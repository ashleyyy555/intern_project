// register page

import { register } from "@/lib/auth";
import Link from "next/link";

type SearchParams = {
  error?: string;
  username?: string;
  from?: string; // "signin" if redirected here from login
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const error = searchParams?.error;
  const prefill = searchParams?.username || "";
  const fromSignin = searchParams?.from === "signin";

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
          <p className="text-gray-600">
            {fromSignin ? "We couldn't find your account. " : ""}
            Register to get started.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={register} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              name="username"
              defaultValue={prefill}
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your username"
              required
              autoComplete="username"
            />
            <p className="text-xs text-gray-500 mt-1">
              If it contains <code>@</code>, we treat it as an email; otherwise as a username.
            </p>
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
              autoComplete="new-password"
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use at least 8 characters. Avoid common passwords.
            </p>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Create account
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={`/auth/signin${prefill ? `?identifier=${encodeURIComponent(prefill)}` : ""}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
