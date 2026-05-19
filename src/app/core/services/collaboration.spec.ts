import { TestBed } from '@angular/core/testing';

import { Collaboration } from './collaboration';

describe('Collaboration', () => {
  let service: Collaboration;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Collaboration);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
