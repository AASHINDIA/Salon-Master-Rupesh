export const getPagination = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

export const paginateResult = (data, total, page, limit) => {
  return {
    totalRecords: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    pageSize: limit,
    records: data,
  };
};
