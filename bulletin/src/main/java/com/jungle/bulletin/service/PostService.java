package com.jungle.bulletin.service;

import com.jungle.bulletin.dto.PostRequest;
import com.jungle.bulletin.dto.PostResponse;
import com.jungle.bulletin.entity.Post;
import com.jungle.bulletin.entity.User;
import com.jungle.bulletin.repository.PostRepository;
import com.jungle.bulletin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor  // final 필드 생성자 자동 생성 → Spring이 Repository 주입
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // 전체 목록 조회 — DB에서 최신순으로 가져온 뒤 엔티티 → DTO 변환
    public List<PostResponse> getAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PostResponse::new) // Post 엔티티 → PostResponse DTO 변환
                .collect(Collectors.toList());
    }

    // 단건 조회 — 없는 id면 orElseThrow()로 예외 발생 (Optional 활용)
    public PostResponse getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
        return new PostResponse(post);
    }

    // 게시글 작성 — JWT에서 추출한 email로 작성자 조회 후 저장
    public PostResponse createPost(PostRequest request, String email) {
        // 현재 로그인한 유저 조회
        User author = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setAuthor(author); // 작성자 설정

        // save()는 id가 없으면 INSERT, 있으면 UPDATE 자동 판단
        return new PostResponse(postRepository.save(post));
    }

    // 게시글 수정 — 게시글 존재 확인 → 작성자 본인 확인 → 수정
    public PostResponse updatePost(Long id, PostRequest request, String email) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!post.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        return new PostResponse(postRepository.save(post));
    }

    // 게시글 삭제 — 작성자 본인 확인 후 영구 삭제, 반환값 없음(void)
    public void deletePost(Long id, String email) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!post.getAuthor().getEmail().equals(email)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }

        postRepository.deleteById(id);
    }
}