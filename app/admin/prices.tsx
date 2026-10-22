// Admin price list: part price per model, repair and grade, with the latest Jiji
// observation next to it. One tap to use the Jiji median, edit, or open Jiji.
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Linking, Pressable, Text, View } from 'react-native'
import { Banner, Button, Card, Chips, Empty, ErrorText, Field, Pill, Screen, Skeleton, Small, tap, Title } from '@/components/ui'
import { DEVICES, type DeviceType } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import * as api from '@/lib/api'
import type { DeviceBrand, Grade, PriceBoardRow } from '@/lib/types'
import { formatNaira, parseNairaToKobo, priceProblem } from '@/lib/validation'

type Filter = 'needs' | 'all'

function jijiSearch(model: string, repair: string) {
  const part = /battery/i.test(repair) ? 'battery' : /screen/i.test(repair) ? 'screen' : repair
  return `https://jiji.ng/search?query=${encodeURIComponent(`${model} ${part}`)}`
}

function PriceRow({ row, onSaved }: { row: PriceBoardRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(row.price_kobo ? String(row.price_kobo / 100) : '')
  const [label, setLabel] = useState(row.market_label ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (kobo: number, marketLabel: string | null) => {
    setBusy(true); setError(null)
    try {
      await api.adminSetPartPrice(row.model_id, row.category, row.grade, kobo, marketLabel)
      setEditing(false)
      onSaved()
    } catch (e) {
      setError(api.friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = () => Alert.alert('Remove this price?', 'Customers will see "priced after check" for this grade.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      try { await api.adminRemovePartPrice(row.model_id, row.category, row.grade); onSaved() } catch (e) { setError(api.friendlyError(e)) }
    } },
  ])

  const median = row.obs_median_kobo ? Math.round(row.obs_median_kobo / 10000) * 10000 : null
  return (
    <View style={{ paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }} testID={`price-${row.model_id}-${row.category}-${row.grade}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={font.bodyStrong}>{row.grade_label}{row.market_label ? <Text style={font.small}>  {row.market_label}</Text> : null}</Text>
          {row.obs_count ? (
            <Small>Jiji {row.obs_date}: {formatNaira(row.obs_low_kobo)}–{formatNaira(row.obs_high_kobo)}, median {formatNaira(row.obs_median_kobo)} ({row.obs_count} ad{row.obs_count === 1 ? '' : 's'})</Small>
          ) : <Small>No Jiji data yet</Small>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[font.bodyStrong, !row.price_kobo && { color: colors.textFaint }]}>{row.price_kobo ? formatNaira(row.price_kobo) : 'Not set'}</Text>
          {row.stale ? <Pill text="Check price" tone="warn" /> : null}
        </View>
      </View>
      {editing ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Part price (₦)" keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, '').slice(0, 7))}
            error={price ? priceProblem(price) : null} testID="edit-price" />
          <Field label="Part type shown to customers (optional)" placeholder={row.category === 'screen_replacement' ? 'e.g. Incell, JK, GX OLED' : row.category === 'battery_replacement' ? 'e.g. Standard cell, High capacity' : 'e.g. Compatible, Original'} value={label} onChangeText={setLabel} maxLength={40} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button style={{ flex: 1 }} title="Save" disabled={!price || !!priceProblem(price)} loading={busy}
              onPress={() => void save(parseNairaToKobo(price)!, label)} testID="save-price" />
            <Button style={{ flex: 1 }} title="Cancel" kind="secondary" onPress={() => setEditing(false)} />
          </View>
          {row.price_kobo ? <Button title="Remove price" kind="ghost" onPress={remove} /> : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
          {median && median !== row.price_kobo ? (
            <Button title={`Use ${formatNaira(median)}`} kind="secondary" loading={busy} style={{ minHeight: 40, marginBottom: 0 }}
              onPress={() => void save(median, row.market_label)} testID="use-median" />
          ) : null}
          <Button title={row.price_kobo ? 'Edit' : 'Set price'} kind="secondary" style={{ minHeight: 40, marginBottom: 0 }} onPress={() => setEditing(true)} />
          <Button title="Jiji" kind="ghost" icon="open-outline" style={{ minHeight: 40, marginBottom: 0 }}
            onPress={() => void Linking.openURL(row.obs_url ?? jijiSearch(row.model_name, row.category_label))} />
        </View>
      )}
      <ErrorText error={error} />
    </View>
  )
}

export default function Prices() {
  const [device, setDevice] = useState<DeviceType>('smartphone')
  const [brands, setBrands] = useState<DeviceBrand[]>([])
  const [brand, setBrand] = useState<string | null>(null)
  const [rows, setRows] = useState<PriceBoardRow[] | null>(null)
  const [filter, setFilter] = useState<Filter>('needs')
  const [open, setOpen] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newModel, setNewModel] = useState('')

  useEffect(() => {
    api.listBrands(device).then((b) => { setBrands(b); setBrand(b[0]?.brand ?? null) }).catch((e) => setError(api.friendlyError(e)))
  }, [device])

  const load = useCallback(async (manual = false) => {
    if (!brand) return
    if (manual) setRefreshing(true)
    try { setRows(await api.adminPriceBoard(device, brand)); setError(null) } catch (e) { setError(api.friendlyError(e)) } finally { setRefreshing(false) }
  }, [device, brand])
  useFocusEffect(useCallback(() => { void load() }, [load]))

  const models = useMemo(() => {
    const byModel = new Map<number, { name: string; rows: PriceBoardRow[] }>()
    for (const r of rows ?? []) {
      if (!byModel.has(r.model_id)) byModel.set(r.model_id, { name: r.model_name, rows: [] })
      byModel.get(r.model_id)!.rows.push(r)
    }
    return [...byModel.entries()].map(([id, m]) => ({
      id, name: m.name, rows: m.rows,
      priced: m.rows.filter((r) => r.price_kobo).length,
      needs: m.rows.filter((r) => !r.price_kobo || r.stale).length,
      hasJiji: m.rows.some((r) => r.obs_count),
    })).filter((m) => filter === 'all' || m.needs > 0)
      .sort((a, b) => Number(b.hasJiji) - Number(a.hasJiji))
  }, [rows, filter])

  const addModel = async () => {
    if (!brand) return
    try {
      await api.adminAddModel(device, brand, newModel)
      setNewModel(''); setAdding(false); void load()
    } catch (e) { setError(api.friendlyError(e)) }
  }

  const hasCatalog = device === 'smartphone' || device === 'tablet'
  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <Title sub="Part prices customers see. Service charge is added on top.">Prices</Title>
      <Chips<DeviceType> value={device} onChange={(d) => { setDevice(d); setRows(null); setOpen(null) }}
        options={DEVICES.map((d) => ({ value: d.type, label: d.label }))} />
      <Chips value={brand} onChange={(b) => { setBrand(b); setRows(null); setOpen(null) }}
        options={brands.map((b) => ({ value: b.brand, label: b.label }))} />
      <ErrorText error={error} />
      {!hasCatalog ? (
        <Banner tone="neutral" text="Laptop and desktop parts vary too much by exact model, so technicians price them after checking the device." />
      ) : (
        <>
          <Chips<Filter> value={filter} onChange={setFilter} options={[{ value: 'needs', label: 'Needs a price' }, { value: 'all', label: 'All models' }]} />
          {rows === null ? <Skeleton rows={4} /> : models.length === 0 ? (
            <Empty icon="checkmark-done-outline" title="Every model here has prices" />
          ) : models.map((m) => (
            <Card key={m.id}>
              <Pressable onPress={() => { tap(); setOpen(open === m.id ? null : m.id) }} accessibilityRole="button" accessibilityLabel={m.name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} testID={`price-model-${m.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={font.bodyStrong}>{m.name}</Text>
                  <Small>{m.priced} of {m.rows.length} prices set{m.hasJiji ? ' · Jiji data available' : ''}</Small>
                </View>
                <Ionicons name={open === m.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textFaint} />
              </Pressable>
              {open === m.id ? [...new Set(m.rows.map((r) => r.category))].map((cat) => (
                <View key={cat} style={{ marginTop: spacing.md }}>
                  <Text style={font.label}>{m.rows.find((r) => r.category === cat)!.category_label}</Text>
                  {m.rows.filter((r) => r.category === cat).map((r) => (
                    <PriceRow key={`${r.category}-${r.grade}`} row={r as PriceBoardRow & { grade: Grade }} onSaved={() => void load()} />
                  ))}
                </View>
              )) : null}
            </Card>
          ))}
        </>
      )}
      {adding ? (
        <Card>
          <Field label="New model name" placeholder="e.g. Galaxy A57" value={newModel} onChangeText={setNewModel} maxLength={60} />
          <Button title="Add model" disabled={newModel.trim().length < 2} onPress={() => void addModel()} />
          <Button title="Cancel" kind="ghost" onPress={() => setAdding(false)} />
        </Card>
      ) : <Button title="Add a model" kind="secondary" icon="add" onPress={() => setAdding(true)} />}
      <Small>Jiji numbers are asking prices from listings, often few per model. Check them before using.</Small>
    </Screen>
  )
}
