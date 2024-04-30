import { t } from 'app/i18next-t';
import { DimItem } from 'app/inventory/item-types';
import { createItemContextSelector } from 'app/inventory/selectors';
import { makeFakeItem } from 'app/inventory/store/d2-item-factory';
import { toggleSearchResults } from 'app/shell/actions';
import { AppIcon, faList } from 'app/shell/icons';
import { querySelector, searchResultsOpenSelector, useIsPhonePortrait } from 'app/shell/selectors';
import { emptyArray } from 'app/utils/empty';
import { DestinyPresentationNodeCollectibleChildEntry } from 'bungie-api-ts/destiny2';
import { motion } from 'framer-motion';
import _ from 'lodash';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import styles from './MainSearchBarActions.m.scss';
import { searchButtonAnimateVariants } from './SearchBar';
import SearchResults from './SearchResults';
import {
  craftablesFilterSelector,
  filteredItemsSelector,
  queryValidSelector,
} from './search-filter';

/**
 * The extra buttons that appear in the main search bar when there are matched items.
 */
export default function MainSearchBarActions() {
  const searchQuery = useSelector(querySelector);
  const queryValid = useSelector(queryValidSelector);
  const filteredItems = useSelector(filteredItemsSelector);
  let filteredPatterns: DimItem[] = [];

  const searchFilter = useSelector(craftablesFilterSelector);
  const context = useSelector(createItemContextSelector);
  if (queryValid && searchQuery.length && context.profileResponse.profileCollectibles.data) {
    const collectionNodeDef = context.defs.PresentationNode.get(
      context.profileResponse.profileCollectibles.data.collectionCategoriesRootNodeHash,
    );

    // Build list of all weapons in Collections
    const profileCollectibleHashes = collectionNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    const profileCollectiblesNodeDef = profileCollectibleHashes.map((hash) =>
      context.defs.PresentationNode.get(hash),
    );

    const exoticsNodeDef = profileCollectiblesNodeDef.find(
      (node) => node.displayProperties.name === 'Exotic',
    )!;
    const exoticChildNodeHashes = exoticsNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    // Exotic weapons
    const exoticKineticNodeDef = context.defs.PresentationNode.get(exoticChildNodeHashes[0]);
    const exoticEnergyNodeDef = context.defs.PresentationNode.get(exoticChildNodeHashes[1]);
    const exoticHeavyNodeDef = context.defs.PresentationNode.get(exoticChildNodeHashes[2]);

    const weaponsNodeDef = profileCollectiblesNodeDef.find(
      (node) => node.displayProperties.name === 'Weapons',
    )!;
    const weaponsChildNodeHashes = weaponsNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    // Primary ammo
    const weaponsPrimaryNodeDef = context.defs.PresentationNode.get(weaponsChildNodeHashes[0]);
    const weaponsPrimaryChildNodeHashes = weaponsPrimaryNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    const weaponsPrimaryFamilyNodeDefs = weaponsPrimaryChildNodeHashes.map((hash) =>
      context.defs.PresentationNode.get(hash),
    );
    // Special ammo
    const weaponsSpecialNodeDef = context.defs.PresentationNode.get(weaponsChildNodeHashes[1]);
    const weaponsSpecialChildNodeHashes = weaponsSpecialNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    const weaponsSpecialFamilyNodeDefs = weaponsSpecialChildNodeHashes.map((hash) =>
      context.defs.PresentationNode.get(hash),
    );
    // Heavy ammo
    const weaponsHeavyNodeDef = context.defs.PresentationNode.get(weaponsChildNodeHashes[2]);
    const weaponsHeavyChildNodeHashes = weaponsHeavyNodeDef.children.presentationNodes.map(
      (node) => node.presentationNodeHash,
    );
    const weaponsHeavyFamilyNodeDefs = weaponsHeavyChildNodeHashes.map((hash) =>
      context.defs.PresentationNode.get(hash),
    );

    const allWeaponHashes: number[] = new Array<DestinyPresentationNodeCollectibleChildEntry>()
      .concat(
        exoticKineticNodeDef.children.collectibles,
        exoticEnergyNodeDef.children.collectibles,
        exoticHeavyNodeDef.children.collectibles,
        weaponsPrimaryFamilyNodeDefs.flatMap((def) => def.children.collectibles),
        weaponsSpecialFamilyNodeDefs.flatMap((def) => def.children.collectibles),
        weaponsHeavyFamilyNodeDefs.flatMap((def) => def.children.collectibles),
      )
      .map((entry) => entry.collectibleHash);

    const allWeapons = allWeaponHashes
      .map((hash) => context.defs.Collectible.get(hash))
      .map((c) => makeFakeItem(context, c.itemHash));

    // Filter allWeapons in Collections by the current search filter + is:patternunlocked (then remove patterns that would be dupes from filteredItems)
    const matchedPatterns = _.compact(allWeapons)
      .filter(searchFilter)
      .filter((pattern) => !filteredItems.map((item) => item.name).includes(pattern.name));

    if (matchedPatterns.length) {
      filteredPatterns = matchedPatterns;
    } else {
      console.log('📝 Found nothing in collectibles: ', collectionNodeDef); // eslint-disable-line no-console
    }
  }

  const searchResultsOpen = useSelector(searchResultsOpenSelector);
  const dispatch = useDispatch();
  const isPhonePortrait = useIsPhonePortrait();

  const location = useLocation();
  const onInventory = location.pathname.endsWith('inventory');
  const onProgress = location.pathname.endsWith('progress');
  const onRecords = location.pathname.endsWith('records');
  const onVendors = location.pathname.endsWith('vendors');

  // We don't have access to the selected store so we'd match multiple characters' worth.
  // Just suppress the count for now
  const showSearchResults = onInventory && !isPhonePortrait;
  const showSearchCount = Boolean(
    queryValid && searchQuery && !onProgress && !onRecords && !onVendors,
  );
  const handleCloseSearchResults = useCallback(
    () => dispatch(toggleSearchResults(false)),
    [dispatch],
  );

  return (
    <>
      {showSearchCount && (
        <motion.div
          key="count"
          variants={searchButtonAnimateVariants}
          exit="hidden"
          initial="hidden"
          animate="shown"
        >
          {showSearchResults ? (
            <button
              type="button"
              className={styles.resultButton}
              title={t('Header.SearchResults')}
              onClick={() => dispatch(toggleSearchResults())}
            >
              <span className={styles.count}>
                {t('Header.FilterMatchCount', { count: filteredItems.length })}
                {filteredPatterns.length > 0 && ' + '}
                {filteredPatterns.length > 0 &&
                  t('Header.FilterPatternCount', { count: filteredPatterns.length })}
              </span>
              <AppIcon icon={faList} />
            </button>
          ) : (
            <span className={styles.count}>
              {t('Header.FilterMatchCount', { count: filteredItems.length })}
              {filteredPatterns.length > 0 && ' + '}
              {filteredPatterns.length > 0 &&
                t('Header.FilterPatternCount', { count: filteredPatterns.length })}
            </span>
          )}
        </motion.div>
      )}

      {searchResultsOpen && (
        <SearchResults
          items={queryValid ? filteredItems : emptyArray()}
          patterns={queryValid ? filteredPatterns : emptyArray()}
          onClose={handleCloseSearchResults}
        />
      )}
    </>
  );
}
