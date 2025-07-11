"use client";

import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "../store/store";

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        {children}
      </SessionProvider>
    </Provider>
  );
}
