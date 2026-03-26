import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { Login } = await import("./components/Login");
      return { Component: Login };
    },
  },
  {
    path: "/unauthorized",
    lazy: async () => {
      const { Unauthorized } = await import("./components/Unauthorized");
      return { Component: Unauthorized };
    },
  },
  {
    path: "/",
    lazy: async () => {
      const { ProtectedLayout } = await import("./components/ProtectedLayout");
      return { Component: ProtectedLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { MainDashboard } = await import("./components/MainDashboard");
          return { Component: MainDashboard };
        },
      },
      {
        path: "room/:roomId",
        lazy: async () => {
          const { RoomDetail } = await import("./components/RoomDetail");
          return { Component: RoomDetail };
        },
      },
      {
        path: "users",
        lazy: async () => {
          const { UserManagement } = await import("./components/UserManagement");
          return { Component: UserManagement };
        },
      },
      {
        path: "config",
        lazy: async () => {
          const { ThresholdConfig } = await import("./components/ThresholdConfig");
          return { Component: ThresholdConfig };
        },
      },
      {
        path: "thresholds",
        lazy: async () => {
          const { ThresholdConfig } = await import("./components/ThresholdConfig");
          return { Component: ThresholdConfig };
        },
      },
      {
        path: "devices",
        lazy: async () => {
          const { DeviceHealth } = await import("./components/DeviceHealth");
          return { Component: DeviceHealth };
        },
      },
      {
        path: "alerts",
        lazy: async () => {
          const { AlertCenter } = await import("./components/AlertCenter");
          return { Component: AlertCenter };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { NotFound } = await import("./components/NotFound");
          return { Component: NotFound };
        },
      },
    ],
  },
]);