package com.jungle.bulletin.service;

import com.jungle.bulletin.dto.PostRequest;
import com.jungle.bulletin.dto.PostResponse;
import com.jungle.bulletin.entity.Post;
import com.jungle.bulletin.entity.User;
import com.jungle.bulletin.repository.PostRepository;
import com.jungle.bulletin.repository.UserRepository;
import com.jungle.bulletin.entity.Tag;
import com.jungle.bulletin.repository.TagRepository;
import com.jungle.bulletin.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor  // final 필드 생성자 자동 생성 → Spring이 Repository 주입
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;

    // 검색 + 카테고리 필터 + 페이징 — 조건 없으면 전체 조회
    public Page<PostResponse> getAllPosts(String keyword, Long domainId, Long projectTypeId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size); // 페이지 번호, 페이지 크기로 Pageable 생성
        return postRepository.search(keyword, domainId, projectTypeId, pageable)
                .map(PostResponse::new); // Page<Post> → Page<PostResponse> 변환
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

        // 태그 처리 — 있으면 재사용, 없으면 새로 생성 후 저장
        if (request.getTags() != null) {
            List<Tag> tags = request.getTags().stream()
                .map(name -> tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(new Tag(name)))) // 없으면 insert
                .collect(Collectors.toList());
            post.setTags(tags);
        }

        // 도메인 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getDomainId() != null) {
            post.setDomain(categoryRepository.findById(request.getDomainId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // 성격 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getProjectTypeId() != null) {
            post.setProjectType(categoryRepository.findById(request.getProjectTypeId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

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

        // 태그 처리 — 있으면 재사용, 없으면 새로 생성 후 저장
        if (request.getTags() != null) {
            List<Tag> tags = request.getTags().stream()
                .map(name -> tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(new Tag(name)))) // 없으면 insert
                .collect(Collectors.toList());
            post.setTags(tags);
        }

        // 도메인 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getDomainId() != null) {
            post.setDomain(categoryRepository.findById(request.getDomainId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

        // 성격 카테고리 — id로 조회 후 게시글에 연결 (없는 id면 예외)
        if (request.getProjectTypeId() != null) {
            post.setProjectType(categoryRepository.findById(request.getProjectTypeId())
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다.")));
        }

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