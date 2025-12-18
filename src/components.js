import React from 'react';
import { Text, View, TouchableOpacity, TextInput } from 'proton-native';

export const Checkbox = ({ label, checked, onChange }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
      <TouchableOpacity onPress={() => onChange(!checked)}>
        <View style={{
          width: 24,
          height: 24,
          borderWidth: 1,
          borderColor: '#555',
          backgroundColor: checked ? '#4a90e2' : '#333',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4
        }}>
          {checked && <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text style={{ marginLeft: 12, color: '#eee', fontSize: 14 }}>{label}</Text>
    </View>
  );
};

export const DButton = (args) => {
  const { style, children, onPress, disabled, backgroundColor, textColor, ...rest } = args;
  const isDanger = args.danger;

  let finalBgColor = backgroundColor;
  if (!finalBgColor) {
    finalBgColor = disabled ? '#444' : (isDanger ? '#d0021b' : '#4a90e2');
  }

  return (
    <TouchableOpacity
      {...rest}
      style={style}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
    >
      <View style={{
        backgroundColor: finalBgColor,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: style?.borderRadius
      }}>
        {typeof children === 'string' ? (
          <Text key={textColor} style={{ color: textColor || 'white', fontSize: 20 }}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ProgressBar = ({ label, current, total, percent, color = '#4a90e2' }) => {
  const displayPercent = percent !== undefined ? percent : (total > 0 ? Math.round((current / total) * 100) : 0);

  return (
    <View style={{ width: '100%', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: '#aaa', fontSize: 12 }}>{label}</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>{current} / {total} ({displayPercent}%)</Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#333', borderRadius: 4, width: '100%', overflow: 'hidden' }}>
        <View style={{ height: '100%', backgroundColor: color, width: `${displayPercent}%` }} />
      </View>
    </View>
  );
};
