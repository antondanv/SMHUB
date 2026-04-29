import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    course_id: '',
    program_id: '',
    group_name: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, coursesRes, programsRes] = await Promise.all([
          apiClient.get('/users/me'),
          apiClient.get('/courses'),
          apiClient.get('/programs')
        ]);

        setUser(userRes.data);
        setCourses(coursesRes.data);
        setPrograms(programsRes.data);
        
        setFormData({
          username: userRes.data.username || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || '',
          middle_name: userRes.data.middle_name || '',
          course_id: userRes.data.course_id || '',
          program_id: userRes.data.program_id || '',
          group_name: userRes.data.group_name || ''
        });
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить данные профиля. Убедитесь, что вы авторизованы.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    
    try {
      // Convert course_id and program_id to integers if they are set
      const submissionData = {
        ...formData,
        course_id: formData.course_id ? parseInt(formData.course_id) : null,
        program_id: formData.program_id ? parseInt(formData.program_id) : null
      };

      const response = await apiClient.patch('/users/me', submissionData);
      setUser(response.data);
      setSuccess('Профиль успешно обновлен!');
    } catch (err) {
      console.error(err);
      setError('Ошибка при обновлении профиля.');
    }
  };

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  
  if (error && !user) return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-100 text-red-700 rounded-lg">
      {error}
      <div className="mt-4">
        <a href="/login" className="text-blue-600 hover:underline">Перейти к входу</a>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Профиль пользователя</h1>
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Имя пользователя (username)</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Фамилия</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Имя</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Отчество</label>
            <input
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Курс</label>
          <select
            name="course_id"
            value={formData.course_id}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите курс</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Направление</label>
          <select
            name="program_id"
            value={formData.program_id}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите направление</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.code} - {program.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Группа</label>
          <input
            type="text"
            name="group_name"
            value={formData.group_name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Напр. ИВТ-21-1"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Сохранить изменения
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
