import CryptoJS from 'crypto-js'

const SECRET_KEY = 'KUHClb5flJsboviTKv32bjL4hgjt1ADR'

export function encryptPayload(data: unknown): string {
  const jsonStr = JSON.stringify(data)
  const blockSize = 16
  // Use byte length (not char length) so multi-byte UTF-8 chars don't break block alignment
  const byteLen = new TextEncoder().encode(jsonStr).length
  const paddingSize = blockSize - (byteLen % blockSize)
  const plaintext = jsonStr + String.fromCharCode(paddingSize).repeat(paddingSize)
  const secretKey = CryptoJS.enc.Utf8.parse(SECRET_KEY)
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintext), secretKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64)
}

export function signPayload(encryptedPayload: string): string {
  const secretKey = CryptoJS.enc.Utf8.parse(SECRET_KEY)
  return CryptoJS.HmacSHA256(encryptedPayload, secretKey).toString(CryptoJS.enc.Hex)
}

export function securePayload(data: unknown) {
  const encryptedPayload = encryptPayload(data)
  const signature = signPayload(encryptedPayload)
  return { encryptedPayload, signature }
}
