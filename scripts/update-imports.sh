#!/bin/bash

# Update imports in admin app
echo "Updating imports in admin app..."
find apps/admin/src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Update UI component imports
  sed -i.bak "s|from '@/components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  sed -i.bak "s|from '../components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  sed -i.bak "s|from '../../components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  
  # Update utils imports
  sed -i.bak "s|from '@/lib/utils'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../lib/utils'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../../lib/utils'|from '@dealbrief/utils'|g" "$file"
done

# Update imports in report-generator app
echo "Updating imports in report-generator app..."
find apps/report-generator -name "*.tsx" -o -name "*.ts" | while read file; do
  # Skip node_modules
  if [[ "$file" == *"node_modules"* ]]; then
    continue
  fi
  
  # Update UI component imports
  sed -i.bak "s|from '@/components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  sed -i.bak "s|from './components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  sed -i.bak "s|from '../components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  sed -i.bak "s|from '../../components/ui/\(.*\)'|from '@dealbrief/ui'|g" "$file"
  
  # Update utils imports
  sed -i.bak "s|from '@/lib/utils'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from './lib/utils'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../lib/utils'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../../lib/utils'|from '@dealbrief/utils'|g" "$file"
  
  # Update hooks imports
  sed -i.bak "s|from '@/hooks/use-mobile'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from './hooks/use-mobile'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../hooks/use-mobile'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '@/hooks/use-toast'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from './hooks/use-toast'|from '@dealbrief/utils'|g" "$file"
  sed -i.bak "s|from '../hooks/use-toast'|from '@dealbrief/utils'|g" "$file"
done

echo "Import updates complete!"

# Remove any temporary backup files created by sed
find apps/admin/src apps/report-generator -name "*.bak" -type f -delete
