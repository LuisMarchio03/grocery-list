export type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number
}

export type SyncStatusValue = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type QueuedMutation =
  | { kind: 'add'; tempId: string; listId: string; name: string; quantity: string }
  | { kind: 'update'; itemId: string; patch: Partial<Pick<Item, 'name' | 'quantity' | 'is_checked' | 'is_promotion'>> & { photo_base64?: string } }
  | { kind: 'delete'; itemId: string }
