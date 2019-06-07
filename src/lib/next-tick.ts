export const nextTick = () => {
  return new Promise((resolve, reject) => setTimeout(resolve));
};

export const waitTicks = async (ticks: number) => {
  for (let i = 0; i < ticks; i = i += 1) {
    await nextTick();
  }
};
