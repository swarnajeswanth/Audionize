import { setUser, setSession, logout } from "../slices/authSlice";

export const syncAuthWithRedux = (store) => (next) => (action) => {
  // Handle NextAuth session updates
  if (action.type === "next-auth/session") {
    const session = action.payload;
    if (session) {
      store.dispatch(setSession(session));
      store.dispatch(setUser(session.user));
    } else {
      store.dispatch(logout());
    }
  }

  return next(action);
};
