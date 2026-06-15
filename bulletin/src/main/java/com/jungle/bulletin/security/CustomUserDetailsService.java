package com.jungle.bulletin.security;

import com.jungle.bulletin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service                    // Spring이 Bean으로 관리 + 비즈니스 로직 계층임을 표시
@RequiredArgsConstructor    // Lombok: final 필드를 생성자로 자동 주입
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository; // DB에서 유저 조회

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // DB에서 이메일로 유저 찾기, 없으면 예외 던짐
        com.jungle.bulletin.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저 없음: " + email));

        // Spring Security가 이해하는 UserDetails 객체로 변환
        return User.builder()
                .username(user.getEmail())    // 식별자 = 이메일
                .password(user.getPassword()) // BCrypt 암호화된 비밀번호
                .roles("USER")                // 권한 (지금은 단순히 USER로 고정)
                .build();
    }
}