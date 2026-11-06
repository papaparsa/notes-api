import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { tsvToModel } from '../../lib/markdownTable';
import { AppModal, Button, ButtonGroup } from '../ui';

const ALIGN_CYCLE = [null, 'left', 'center', 'right'];
const ALIGN_LABEL = { null: '–', left: '⇤', center: '↔', right: '⇥' };

const toGrid = (model) => [model.headers, ...model.rows].map((r) => [...r]);

export default function TableEditorModal({ visible, table, onCancel, onSave }) {
  const { colors } = useTheme();
  const [grid, setGrid] = useState([['']]);
  const [aligns, setAligns] = useState([null]);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const refs = useRef({});

  useEffect(() => {
    if (visible && table) {
      setGrid(toGrid(table));
      setAligns([...table.aligns]);
      setFocus({ r: 0, c: 0 });
    }
  }, [visible, table]);

  const cols = grid[0]?.length || 1;

  const focusCell = (r, c) => {
    setFocus({ r, c });
    setTimeout(() => refs.current[`${r}-${c}`]?.focus(), 30);
  };

  const setCell = (r, c, value) => {
    if (/[\t\n]/.test(value) && value.length > 1) {
      const model = tsvToModel(value.includes('\n') ? value : `${value}\n`);
      const pasted = value.split(/\r?\n/).filter((l, i, arr) => l.length || i < arr.length - 1).map((l) => l.split('\t'));
      if (model || pasted.length) {
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          const needCols = Math.max(cols, c + Math.max(...pasted.map((p) => p.length)));
          next.forEach((row) => {
            while (row.length < needCols) row.push('');
          });
          pasted.forEach((cells, i) => {
            const rr = r + i;
            while (next.length <= rr) next.push(Array(needCols).fill(''));
            cells.forEach((cell, j) => {
              next[rr][c + j] = cell;
            });
          });
          setAligns((a) => Array.from({ length: needCols }, (_, i) => a[i] ?? null));
          return next;
        });
        return;
      }
    }
    setGrid((prev) => prev.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)));
  };

  const addRow = (offset) => {
    const at = Math.max(1, focus.r + offset);
    setGrid((prev) => [...prev.slice(0, at), Array(cols).fill(''), ...prev.slice(at)]);
    focusCell(at, focus.c);
  };

  const moveRow = (dir) => {
    const target = focus.r + dir;
    if (focus.r < 1 || target < 1 || target >= grid.length) return;
    setGrid((prev) => {
      const next = [...prev];
      [next[focus.r], next[target]] = [next[target], next[focus.r]];
      return next;
    });
    setFocus({ r: target, c: focus.c });
  };

  const deleteRow = () => {
    if (focus.r === 0) return;
    setGrid((prev) => prev.filter((_, i) => i !== focus.r));
    setFocus({ r: Math.max(0, focus.r - 1), c: focus.c });
  };

  const addCol = (offset) => {
    const at = focus.c + offset;
    setGrid((prev) => prev.map((row, i) => [...row.slice(0, at), i === 0 ? `Column ${cols + 1}` : '', ...row.slice(at)]));
    setAligns((prev) => [...prev.slice(0, at), null, ...prev.slice(at)]);
    focusCell(focus.r, at);
  };

  const deleteCol = () => {
    if (cols <= 1) return;
    setGrid((prev) => prev.map((row) => row.filter((_, i) => i !== focus.c)));
    setAligns((prev) => prev.filter((_, i) => i !== focus.c));
    setFocus({ r: focus.r, c: Math.max(0, focus.c - 1) });
  };

  const cycleAlign = (c) => setAligns((prev) => prev.map((a, i) => (i === c ? ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(a) + 1) % 4] : a)));

  const save = () => onSave({ headers: grid[0], aligns, rows: grid.slice(1) });

  const nextRow = (r, c) => {
    if (r === grid.length - 1) {
      setGrid((prev) => [...prev, Array(cols).fill('')]);
    }
    focusCell(r + 1, c);
  };

  const onKey = (e, r, c) => {
    if (Platform.OS !== 'web') return;
    const ne = e.nativeEvent;
    if ((ne.ctrlKey || ne.metaKey) && ne.key === 'Enter') {
      e.preventDefault();
      save();
    } else if ((ne.key === 'Enter' && ne.shiftKey) || ne.key === 'ArrowUp') {
      e.preventDefault();
      if (r > 0) focusCell(r - 1, c);
    } else if (ne.key === 'Enter' || ne.key === 'ArrowDown') {
      e.preventDefault();
      nextRow(r, c);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onCancel}
      title="Edit Table"
      titleStyle={{ fontSize: 16 }}
      headerStyle={{ padding: 8 }}
      size="xl"
      fullscreen="md-down"
      footer={
        <>
          <Button variant="secondary" title="Cancel" onPress={onCancel} />
          <Button title="Save" onPress={save} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <ButtonGroup>
          <Button size="sm" variant="outline-secondary" title="Row above" onPress={() => addRow(0)} />
          <Button size="sm" variant="outline-secondary" title="Row below" onPress={() => addRow(1)} />
          <Button size="sm" variant="outline-secondary" title="↑" onPress={() => moveRow(-1)} disabled={focus.r <= 1} />
          <Button size="sm" variant="outline-secondary" title="↓" onPress={() => moveRow(1)} disabled={focus.r === 0 || focus.r >= grid.length - 1} />
          <Button size="sm" variant="outline-danger" title="Delete row" onPress={deleteRow} disabled={focus.r === 0} />
        </ButtonGroup>
        <ButtonGroup>
          <Button size="sm" variant="outline-secondary" title="Column left" onPress={() => addCol(0)} />
          <Button size="sm" variant="outline-secondary" title="Column right" onPress={() => addCol(1)} />
          <Button size="sm" variant="outline-danger" title="Delete column" onPress={deleteCol} disabled={cols <= 1} />
        </ButtonGroup>
      </View>
      <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled>
        <ScrollView horizontal nestedScrollEnabled>
          <View style={{ borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row' }}>
              {aligns.map((a, c) => (
                <View key={c} style={{ width: 128, padding: 2, borderRightWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                  <Button size="sm" variant="outline-secondary" title={ALIGN_LABEL[a]} accessibilityLabel={`Alignment: ${a || 'default'}`} onPress={() => cycleAlign(c)} style={{ paddingVertical: 0 }} />
                </View>
              ))}
            </View>
            {grid.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', backgroundColor: r === 0 ? colors.tertiaryBg : 'transparent' }}>
                {row.map((cell, c) => (
                  <TextInput
                    key={c}
                    ref={(el) => {
                      refs.current[`${r}-${c}`] = el;
                    }}
                    value={cell}
                    onChangeText={(v) => setCell(r, c, v)}
                    onFocus={() => setFocus({ r, c })}
                    selectTextOnFocus
                    onKeyPress={(e) => onKey(e, r, c)}
                    onSubmitEditing={() => nextRow(r, c)}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    style={[
                      {
                        width: 128,
                        minWidth: 128,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderTopWidth: 1,
                        borderRightWidth: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        fontWeight: r === 0 ? '700' : '400',
                        fontSize: 14,
                        textAlign: aligns[c] === 'center' ? 'center' : aligns[c] === 'right' ? 'right' : 'left',
                        backgroundColor: focus.r === r && focus.c === c ? colors.secondaryBg : 'transparent',
                      },
                      Platform.OS === 'web' && { outlineStyle: 'none' },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </AppModal>
  );
}
