import { useState } from 'react';

interface Product {
  id?: string;
  name: string;
  specification?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  deliveryDate?: string;
  warrantyPeriod?: number;
}

interface ProductListProps {
  products: Product[];
  editable?: boolean;
  onChange?: (products: Product[]) => void;
}

export function ProductList({ products, editable = false, onChange }: ProductListProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products);

  const handleProductChange = (index: number, field: keyof Product, value: any) => {
    const newProducts = [...localProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setLocalProducts(newProducts);
    onChange?.(newProducts);
  };

  const handleAddProduct = () => {
    const newProduct: Product = {
      name: '',
      quantity: 1,
      unitPrice: 0,
      unit: '件',
    };
    const newProducts = [...localProducts, newProduct];
    setLocalProducts(newProducts);
    onChange?.(newProducts);
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = localProducts.filter((_, i) => i !== index);
    setLocalProducts(newProducts);
    onChange?.(newProducts);
  };

  const totalAmount = localProducts.reduce((sum, p) => {
    return sum + (p.quantity * p.unitPrice);
  }, 0);

  const totalQuantity = localProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>产品明细</h3>
        {editable && (
          <button onClick={handleAddProduct} style={styles.addButton}>
            + 添加产品
          </button>
        )}
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>产品名称</th>
              <th style={styles.th}>规格型号</th>
              <th style={styles.th}>数量</th>
              <th style={styles.th}>单位</th>
              <th style={styles.th}>单价(¥)</th>
              <th style={styles.th}>金额(¥)</th>
              <th style={styles.th}>交付日期</th>
              <th style={styles.th}>质保期</th>
              {editable && <th style={styles.th}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {localProducts.map((product, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                      style={styles.input}
                      placeholder="产品名称"
                    />
                  ) : (
                    product.name
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="text"
                      value={product.specification || ''}
                      onChange={(e) => handleProductChange(index, 'specification', e.target.value)}
                      style={styles.input}
                      placeholder="规格型号"
                    />
                  ) : (
                    product.specification || '-'
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      style={styles.numberInput}
                      min="1"
                    />
                  ) : (
                    product.quantity
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="text"
                      value={product.unit || '件'}
                      onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    product.unit || '件'
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="number"
                      value={product.unitPrice}
                      onChange={(e) => handleProductChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    `¥${product.unitPrice.toFixed(2)}`
                  )}
                </td>
                <td style={styles.td}>
                  ¥{(product.quantity * product.unitPrice).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="date"
                      value={product.deliveryDate ? product.deliveryDate.split('T')[0] : ''}
                      onChange={(e) => handleProductChange(index, 'deliveryDate', e.target.value)}
                      style={styles.dateInput}
                    />
                  ) : (
                    product.deliveryDate ? new Date(product.deliveryDate).toLocaleDateString('zh-CN') : '-'
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="number"
                      value={product.warrantyPeriod || ''}
                      onChange={(e) => handleProductChange(index, 'warrantyPeriod', parseInt(e.target.value) || undefined)}
                      style={styles.numberInput}
                      min="0"
                      placeholder="月"
                    />
                  ) : (
                    product.warrantyPeriod ? `${product.warrantyPeriod}个月` : '-'
                  )}
                </td>
                {editable && (
                  <td style={styles.td}>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      style={styles.removeButton}
                    >
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {localProducts.length === 0 && (
              <tr>
                <td colSpan={editable ? 9 : 8} style={styles.emptyTd}>
                  暂无产品明细
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {localProducts.length > 0 && (
        <div style={styles.summary}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>产品总数：</span>
            <span style={styles.summaryValue}>{totalQuantity} {localProducts[0]?.unit || '件'}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>产品种类：</span>
            <span style={styles.summaryValue}>{localProducts.length} 种</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>总金额：</span>
            <span style={styles.summaryTotal}>
              ¥{totalAmount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
  },
  emptyTd: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    minWidth: '120px',
    padding: '6px 8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  numberInput: {
    width: '80px',
    padding: '6px 8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  dateInput: {
    padding: '6px 8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  summaryTotal: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#3b82f6',
  },
};

export default ProductList;
