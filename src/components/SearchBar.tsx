import React from 'react';
import { inputStyle, buttonStyle, purpleDark, yellow } from '../styles.ts';

export const SearchBar = ({
  searchColumn,
  setSearchColumn,
  search,
  setSearch,
  isSearching,
  handleExportAll,
  openedContracts,
  closedContracts,
}) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <select
        value={searchColumn}
        onChange={e => setSearchColumn(e.target.value)}
        style={{
          ...inputStyle,
          width: 150,
          marginRight: 8,
          verticalAlign: 'middle'
        }}
      >
        <option value="All">Search All</option>
        <option value="Contract No.">Contract No.</option>
        <option value="Customer">Customer</option>
        <option value="Plate No.">Plate No.</option>
        <option value="Phone Number">Phone Number</option>
      </select>
      <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginRight: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            width: 260,
            fontSize: 15,
            paddingRight: '30px',
            direction: ''
          }}
        />
        {isSearching && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: 5,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: '#aaa',
              padding: '0 5px',
              lineHeight: 1
            }}
            title="Clear search"
          >
            &times;
          </button>
        )}
      </div>
      <button
        style={{ ...buttonStyle, background: '#4A148C', color: '#FFD600', fontWeight: 'bold', fontSize: 16 }}
        onClick={handleExportAll}
        disabled={openedContracts.length === 0 && closedContracts.length === 0}
      >
        ⬇️ Export All Results
      </button>
    </div>
  );
};