package com.jungle.bulletin.service;

import com.jungle.bulletin.dto.CommentRequest;
import com.jungle.bulletin.dto.CommentResponse;
import com.jungle.bulletin.entity.Comment;
import com.jungle.bulletin.entity.Post;
import com.jungle.bulletin.entity.User;
import com.jungle.bulletin.repository.CommentRepository;
import com.jungle.bulletin.repository.PostRepository;
import com.jungle.bulletin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // 특정 게시글의 댓글 목록 조회 — 오래된 순(위→아래)으로 반환
    public List<CommentResponse> getComments(Long postId) {
        return commentRepository.findAllByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(CommentResponse::new).collect(Collectors.toList());
    }

    // 댓글 작성 — JWT email로 작성자 조회, postId로 게시글 조회 후 저장
    public CommentResponse createComment(Long postId, CommentRequest request, String email) {
        User author = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setAuthor(author);
        comment.setPost(post);
        return new CommentResponse(commentRepository.save(comment));
    }

    // 댓글 수정 — commentId로 직접 조회 → 작성자 본인 확인 → 수정
    public CommentResponse updateComment(Long commentId, CommentRequest request, String email) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        if (!comment.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }
        comment.setContent(request.getContent());
        return new CommentResponse(commentRepository.save(comment));
    }

    // 댓글 삭제 — 작성자 본인 확인 후 영구 삭제, 반환값 없음(void)
    public void deleteComment(Long commentId, String email) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        if (!comment.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }
        commentRepository.deleteById(commentId);
    }
}