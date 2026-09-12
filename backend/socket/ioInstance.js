let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  return ioInstance;
};

export default { setIO, getIO };
