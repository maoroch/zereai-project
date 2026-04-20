export const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message: data.message || 'Operation successful',
    data: data.data ?? data,
    timestamp: new Date().toISOString(),
  });
};

export const error = (res, message = 'Internal server error', statusCode = 500, details = null) => {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (details && process.env.NODE_ENV !== 'production') body.details = details;
  return res.status(statusCode).json(body);
};
