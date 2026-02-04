/**
 * TYPES PARAMÈTRES MUSÉE
 * Structures pour les réglages système du musée
 */

export interface DayHours {
  open: string
  close: string
  closed: boolean
}

export interface OpeningHours {
  lundi?: DayHours
  mardi?: DayHours
  mercredi?: DayHours
  jeudi?: DayHours
  vendredi?: DayHours
  samedi?: DayHours
  dimanche?: DayHours
  [key: string]: DayHours | undefined
}

export interface MuseumSetting {
  id?: number
  setting_key: string
  setting_value: string | OpeningHours | string[]
  created_at?: string
  updated_at?: string
}
