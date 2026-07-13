import { Navigate, type RouteObject } from "react-router-dom";
import { EditorPage } from "../pages/EditorPage";

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/editor" replace /> },
  { path: "/editor", element: <EditorPage /> },
  { path: "/editor/:projectId", element: <EditorPage /> },
];
