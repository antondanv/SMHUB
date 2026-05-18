import apiClient from './apiClient';

let referenceDataCache = null;
let referenceDataPromise = null;

export async function getCourses() {
  const response = await apiClient.get('/courses');

  return response.data;
}

export async function getPrograms() {
  const response = await apiClient.get('/programs');

  return response.data;
}

export async function getSubjects() {
  const response = await apiClient.get('/subjects');

  return response.data;
}

export async function getMaterialTypes() {
  const response = await apiClient.get('/material-types');

  return response.data;
}

export async function getReferenceData(options = {}) {
  const { force = false } = options;

  if (referenceDataCache && !force) {
    return referenceDataCache;
  }

  if (!referenceDataPromise || force) {
    referenceDataPromise = Promise.all([
      getCourses(),
      getPrograms(),
      getSubjects(),
      getMaterialTypes(),
    ])
      .then(([courses, programs, subjects, materialTypes]) => {
        referenceDataCache = {
          courses,
          programs,
          subjects,
          materialTypes,
        };

        return referenceDataCache;
      })
      .finally(() => {
        referenceDataPromise = null;
      });
  }

  return referenceDataPromise;
}
