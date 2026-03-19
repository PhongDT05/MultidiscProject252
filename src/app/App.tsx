import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { DataLogProvider } from "./contexts/DataLogContext";
import { AppDataProvider } from "./contexts/AppDataContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <DataLogProvider>
          <RouterProvider router={router} />
          <Toaster />
        </DataLogProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}