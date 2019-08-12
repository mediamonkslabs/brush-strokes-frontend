import * as React from 'react';
import styles from './Loader.module.css';

interface Props {
  progress: number;
}

const Loader = ({ progress }: Props) => {
  const isVisible = progress < 1;

  if (!isVisible) {
    return null;
  }

  return <div className={styles.root}>Loading {progress * 100}%</div>;
};

export default Loader;
