"use client";

import { createContext, useContext } from "react";

export const UserIdContext = createContext(null);

export function useUserId() {
  return useContext(UserIdContext);
}
