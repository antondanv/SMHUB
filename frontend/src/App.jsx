import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import FavoritesPage from './pages/FavoritesPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MaterialCreatePage from './pages/MaterialCreatePage';
import MaterialDetailPage from './pages/MaterialDetailPage';
import MaterialEditPage from './pages/MaterialEditPage';
import MaterialsPage from './pages/MaterialsPage';
import ModerationPage from './pages/ModerationPage';
import MyMaterialsPage from './pages/MyMaterialsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="materials/:id" element={<MaterialDetailPage />} />
          <Route path="materials/:id/edit" element={<MaterialEditPage />} />
          <Route path="materials/create" element={<MaterialCreatePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="my-materials" element={<MyMaterialsPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<LoginPage defaultMode="register" />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
