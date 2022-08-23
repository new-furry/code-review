import React, { useState, useEffect } from 'react';
import {
  SectionList,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';

import { Video, NavBar } from '../../components/Common';
import IconRight from './IconRight';
import { Play, PremiumTip1 } from '../../components/Icons';
import { Modal } from '../../components/Modal';
import PremiumPopup from '../../components/Modal/PremiumPopup';
import { withMappedNavigationParams } from 'react-navigation-props-mapper';
import AssignmentCell from '../../components/Challenge/AssignmentCell';

import { createChallengeCommon } from './commonStyles';
import { Typography } from '../../helpers/styles/typography';
import { BaseColors } from '../../helpers/styles/color';
import { BaseStyle } from '../../helpers/styles/theme';

function Component(props) {
  const [play, setPlay] = useState(false);
  const [startLoadVideo, setStartLoadVideo] = useState(false);

  const { plan, navigation } = props;
  const {
    title,
    description,
    assignments,
    headerImageUrl,
    trailerVideoURL,
  } = plan;

  useEffect(() => {
    setTimeout(() => setStartLoadVideo(true), 300);
  }, []);
  const titleView = (
    <>
      <ImageBackground
        source={{ uri: headerImageUrl }}
        resieMode={'contain'}
        style={styles.headerImage}
      />

      <View style={styles.detailWrapper}>
        {!!trailerVideoURL && (
          <TouchableOpacity
            style={styles.trailerWrapper}
            onPress={() => setPlay(true)}
          >
            <Play fill={BaseColors.gray700} width={20} height={20} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </>
  );

  return (
    <View style={createChallengeCommon.container}>
      <NavBar
        title={'Create New Challenge'}
        shadow={false}
        iconRight={<IconRight />}
      />
      <SectionList
        sections={[
          {
            data: [0].concat(assignments),
          },
        ]}
        renderItem={({ item, index }) => {
          const numberOfDays = assignments.length || 0;
          return (
            <View style={{ paddingHorizontal: 16 }}>
              {index !== 0 ? (
                <AssignmentCell item={{ assignment: item, index }} />
              ) : (
                <Text style={[BaseStyle.globalHeading2, { paddingTop: 24 }]}>
                  {numberOfDays} Day Schedule
                </Text>
              )}
            </View>
          );
        }}
        renderSectionHeader={() => titleView}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item, index) => index}
        contentContainerStyle={{
          backgroundColor: 'white',
          paddingBottom: 90,
        }}
        bounces={false}
      />
      <TouchableOpacity
        style={styles.buttonConfirm}
        onPress={() => {
          navigation.navigate('NameChallenge', { plan });
        }}
      >
        <Text style={createChallengeCommon.nextButtonText}>Confirm Plan</Text>
      </TouchableOpacity>

      {startLoadVideo && <Video play={play} setPlay={setPlay} item={plan} />}
    </View>
  );
}

export default withMappedNavigationParams()(Component);

const styles = StyleSheet.create({
  premium: {
    width: '100%',
    height: 72,
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 16,
  },
  headerImage: {
    flex: 1,
    resizeMode: 'cover',
    width: '100%',
    aspectRatio: 0.93,
  },
  premiumText: {
    ...Typography.headingExtra,
    color: '#FFFFFF',
    marginRight: 16,
  },
  premiumPrice: {
    ...Typography.paraNormalSemi,
    color: '#FFFFFF',
  },
  detailWrapper: {
    flex: 1,
    left: 0,
    bottom: 0,
    width: '100%',
    position: 'absolute',
  },
  title: {
    ...Typography.headingSmall,
    textAlignVertical: 'center',
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  description: {
    ...Typography.paraSmall,
    textAlignVertical: 'center',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 28,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  trailerWrapper: {
    width: 68,
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonConfirm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    ...createChallengeCommon.nextButton,
  },
});
