import React, { Component } from 'react'; // import from react

import { Window, App, Text, View, Button, Image, TouchableOpacity, TextInput } from 'proton-native'; // import the proton-native components

export const Checkbox = ({ label, checked, onChange }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Button title={checked ? '[x]' : '[ ]'} onPress={() => onChange(!checked)} />
      <Text style={{ marginLeft: 8 }}>{label}</Text>
    </View>
  );
};

export const DButton = (args) => {
  if (args.disabled) {
    const newArgs = Object.assign({}, args);
    newArgs.onPress = () => { };
    if (!newArgs.style) newArgs.style = {};
    Object.assign(newArgs.style, { color: '#ccc' });
    return <Button {...newArgs} />;
  }
  return <Button {...args} />;
};
