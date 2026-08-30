import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScoreReveal } from '../../components/ScoreReveal';
import { useProductResult, type ProductResultSection } from './ProductResultContext';

const GRADES = ['a', 'b', 'c', 'd', 'e'] as const;

function hasUsableGrade(grade: string | undefined): boolean {
  return !!grade && (GRADES as readonly string[]).includes(grade.toLowerCase());
}

function ScoresSection() {
  const { t } = useTranslation();
  const { product, styles } = useProductResult();
  const showGrade = hasUsableGrade(product.nutriscoreGrade);
  if (!showGrade && !product.novaGroup) return null;

  return (
    <View style={styles.scoreRow}>
      {showGrade ? <ScoreReveal nutriscoreGrade={product.nutriscoreGrade} /> : null}
      <View style={styles.scoreLabelWrap}>
        {showGrade ? <Text style={styles.scoreLabel}>{t('result.nutriScore')}</Text> : null}
        {product.novaGroup ? (
          <Text style={showGrade ? styles.scoreSub : styles.scoreLabel}>
            {t('result.novaGroup', { group: product.novaGroup })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const scoresSection: ProductResultSection = {
  id: 'scores',
  Component: ScoresSection,
};
