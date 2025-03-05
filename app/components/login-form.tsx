'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field, Input, Label, Button } from '@headlessui/react';
import { Spinner } from '@nextui-org/react';
import { getProviders, signIn, useSession } from 'next-auth/react';

import { title } from '@/app/components/primitives';

export default function LoginForm() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();

  const target = searchParams.get('callbackUrl') ?? '/';
  const callbackUrl = decodeURI(target);

  useEffect(() => {
    // redirect if already authenticated
    if (session.status === 'authenticated') {
      router.replace(callbackUrl);
    }

    // check if we can sign in automatically
    getProviders().then((providers) => {
      // if no api token required we can automatically sign user in
      if (providers?.credentials.name === 'No Auth') {
        signIn('credentials', {
          redirect: false,
        }).then((response) => {
          if (!response?.error && response?.ok) {
            router.replace(callbackUrl);
          }
        });
      }
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await signIn('credentials', {
      apiToken: input,
      redirect: false,
    });

    result?.error ? setError('invalid API key') : router.replace(callbackUrl);
  };

  return session.status === 'loading' ? (
    <div className="flex flex-col items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <div className=" bg-white shadow-lg shadow-orange-300 rounded-lg p-12 mb-4 min-w-[400px] ">
        <h1 className={title()}>Login</h1>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Field className="flex flex-col gap-4">
              <Label className="text-md">Please provide API key to sign in</Label>
              <Input
                required
                className="block border border-gray-500 rounded-md min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                invalid={!!error}
                placeholder="Enter API Key"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {error && <p className="text-red-500">{error}</p>}
            </Field>
            <div>
              <Button
                className="w-full bg-orange-400 text-white font-bold hover:bg-orange-500 p-4 rounded-lg"
                type="submit"
              >
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
