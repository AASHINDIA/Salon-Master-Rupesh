import axios from 'axios';

const API_URL = import.meta.env.VITE_BASE_URL + 'api/v1/categories';

// Get all categories
const getCategories = async (params = {}) => {
  const response = await axios.get(API_URL, { params });
  return response.data;
};

// Get single category
const getCategory = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// Create category
const createCategory = async (categoryData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.post(API_URL, categoryData, config);
  return response.data;
};

// Update category
const updateCategory = async (id, categoryData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.put(`${API_URL}/${id}`, categoryData, config);
  return response.data;
};

// Delete category
const deleteCategory = async (id, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.delete(`${API_URL}/${id}`, config);
  return response.data;
};

// Toggle category status
const toggleCategoryStatus = async (id, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.patch(`${API_URL}/${id}/status`, {}, config);
  return response.data;
};

// Get category products
const getCategoryProducts = async (id, params = {}) => {
  const response = await axios.get(`${API_URL}/${id}/products`, { params });
  return response.data;
};

const categoryService = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryProducts,
};

export default categoryService;