import { execSync } from 'child_process'

export default function globalSetup() {
  execSync('npm run migrate', { stdio: 'inherit' })
  execSync('npm run seed', { stdio: 'inherit' })
}
