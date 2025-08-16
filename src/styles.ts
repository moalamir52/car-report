export const yellow = '#FFD600';
export const yellowDark = '#FFC300';
export const purple = '#6A1B9A';
export const purpleDark = '#4A148C';
export const white = '#fff';

export const th = {
  padding: '12px',
  textAlign: 'center' as const,
  border: `1px solid ${purple}` ,
  backgroundColor: yellow,
  color: purple,
  fontWeight: 'bold',
  fontSize: '15px',
  letterSpacing: '0.5px'
};

export const td = {
  padding: '10px',
  textAlign: 'center' as const,
  border: `1px solid ${purple}` ,
  color: purpleDark,
  fontSize: '14px'
};

export const buttonStyle = {
  padding: '10px 22px',
  borderRadius: '8px',
  border: `2px solid ${purple}` ,
  backgroundColor: yellow,
  color: purpleDark,
  fontWeight: 'bold',
  fontSize: '15px',
  boxShadow: '0 2px 8px #ffd60044',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

export const buttonActive = {
  ...buttonStyle,
  backgroundColor: purple,
  color: yellow,
  border: `2px solid ${yellow}` ,
  boxShadow: '0 2px 12px #6a1b9a33'
};

export const inputStyle = {
  padding: '10px',
  borderRadius: 8,
  border: `1.5px solid ${purple}` ,
  fontSize: '14px',
  marginTop: '4px',
  marginBottom: '4px'
};
