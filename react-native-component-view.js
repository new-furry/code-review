import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import * as PostsActions from 'dash/src/actions/posts';
import { Comments, Like } from 'dash/src/components/Icons';
import ActivityButton from './ActivityButton';
import Comment from './Comment';
import { connect } from 'react-redux';
import ImagePreview from './ImagePreview';
import { Modal } from '../../../../components/Modal';

const { width } = Dimensions.get('screen');

function Component(props) {
  const {
    user,
    post,
    challenge,
    showAllButton,
    onPressShowAll,
    blockComment,
    showComments,
  } = props;

  let comments = [];
  let replyCount = 0;

  const host = challenge.hostedBy;

  const [like, setLike] = useState(post.cheeredBy.some((v) => v === user.id));
  const [cheerCount, setCheerCount] = useState(post.totalCheers);
  const [upost, setUpost] = useState(post);

  useEffect(() => {
    paramsUpdate();
  }, [props.post]);

  const paramsUpdate = () => {
    setCheerCount(props.post.totalCheers);
    setLike(post.cheeredBy.some((v) => v === user.id));
    setUpost(post);
  };

  const goToPostPage = () => {
    let cheerbyArr = [];

    if (upost.cheeredBy.length !== 0 && upost.cheeredBy[0].firstName) {
      upost.cheeredBy.forEach((cheerby) => {
        cheerbyArr.push(cheerby.id);
      });
    } else {
      cheerbyArr = upost.cheeredBy;
    }

    let updatePost = {
      ...post,
      cheeredBy: cheerbyArr,
      totalCheers: cheerCount,
    };

    if (!blockComment) {
      Actions.PostPage({ post: updatePost, user, challenge });
    }
  };

  const onPressLike = async () => {
    try {
      if (like) {
        const uncheerResult = await PostsActions.uncheerPost(post.id);
        setLike(false);
        setCheerCount(uncheerResult.totalCheers);
        setUpost(uncheerResult);
      } else {
        const cheerResult = await PostsActions.cheerPost(post.id);
        setLike(true);
        setCheerCount(cheerResult.totalCheers);
        setUpost(cheerResult);
      }
    } catch (e) {
      console.log(e.message);
      console.log(e.response);
      setLike(null);
    }
  };

  if (post && post.replies) {
    comments = post.replies;
    replyCount = post.replies.length;
  }

  let content = '';
  let imageUrl = '';

  if (post) {
    content = post.content;
    imageUrl = post.imageUrl;
  }

  return (
    <View>
      <TouchableWithoutFeedback onPress={goToPostPage}>
        <View>
          <Text style={styles.postText}>{content}</Text>

          {imageUrl && (
            <TouchableOpacity
              onPress={() =>
                Modal.modalRefCenter.open({
                  Content: ImagePreview,
                  data: {
                    imageUrl: imageUrl,
                  },
                })
              }
            >
              <Image
                resizeMode="cover"
                source={{ uri: `${imageUrl}` }}
                style={styles.picture}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.activities}>
        <View style={styles.buttons}>
          <ActivityButton
            icon={Like}
            onPress={onPressLike}
            enabled={like}
            cheerCount={cheerCount}
          />
          <ActivityButton
            enabled={blockComment}
            icon={Comments}
            onPress={goToPostPage}
            commentsCount={replyCount}
          />
        </View>
        {/* this shows comment content on posts */}
        {showComments && comments && comments.length !== 0 && (
          <>
            <View style={styles.commentsContainer}>
              {post.replies &&
                comments.map((v, i) => {
                  return <Comment key={i} post={v} host={host} />;
                })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default Component;

const styles = StyleSheet.create({
  postText: {
    marginHorizontal: 16,
    marginBottom: 16,
    color: '#292E3A',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    fontWeight: '500',
  },
  picture: {
    width: '100%',
    height: width - 30,
  },
  commentsCount: {
    color: 'white',
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    lineHeight: 12,
  },
  commentsCountContainer: {
    backgroundColor: '#1AA0FF',
    height: 17,
    width: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    marginLeft: 10,
  },
  allCommentsText: {
    color: '#1AA0FF',
    fontFamily: 'Poppins-Bold',
    lineHeight: 20,
  },
  seeAllCommentsContainer: {
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#E9F6FF',
    borderRadius: 10,
    marginBottom: 15,
  },
  commentsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  buttons: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5FA',
    height: 52,
  },
  activities: {
    borderTopWidth: 1,
    borderTopColor: '#F0F5FA',
  },
});
